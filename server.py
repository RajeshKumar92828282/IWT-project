"""
JobPortal Academic Full-Stack Server
Standard Library HTTP Server + MySQL Bridge
No external backend frameworks (zero Node/Express/PHP/Django).
Connects Vanilla JavaScript frontend directly to local MySQL database.
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import hashlib
import uuid
import mysql.connector
from datetime import datetime, date

PORT = 8000
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Aiden@9090',
    'database': 'jobportal_db',
    'port': 3306,
    'autocommit': True
}

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.strip().encode('utf-8')).hexdigest()

class JobPortalRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.abspath(os.path.dirname(__file__)), **kwargs)

    def _send_json(self, data, status=200):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role')
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(body)
        except Exception:
            return {}

    def _get_auth_user(self):
        email = self.headers.get('X-User-Email', '').strip()
        if not email:
            return None
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT id, user_uuid, name, email, role, company FROM users WHERE email = %s;", (email,))
            user = cur.fetchone()
            conn.close()
            return user
        except Exception:
            return None

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if not path.startswith('/api/'):
            # Static file serving
            return super().do_GET()

        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            # 1. Check current logged-in user
            if path == '/api/auth/me':
                user = self._get_auth_user()
                conn.close()
                if user:
                    return self._send_json({'success': True, 'user': user})
                return self._send_json({'success': False, 'message': 'Not logged in'}, 401)

            # 2. Public Jobs list (filters & keyword search)
            if path == '/api/jobs':
                keyword = query.get('keyword', [''])[0].strip().lower()
                location = query.get('location', [''])[0].strip().lower()
                category = query.get('category', [''])[0].strip()
                jtype = query.get('type', [''])[0].strip()

                sql = "SELECT * FROM jobs WHERE is_active = 1"
                params = []

                if keyword:
                    sql += " AND (LOWER(title) LIKE %s OR LOWER(company) LIKE %s OR LOWER(description) LIKE %s)"
                    pattern = f"%{keyword}%"
                    params.extend([pattern, pattern, pattern])

                if location:
                    sql += " AND LOWER(location) LIKE %s"
                    params.append(f"%{location}%")

                if category and category != 'all':
                    sql += " AND category = %s"
                    params.append(category)

                if jtype and jtype != 'all':
                    sql += " AND type = %s"
                    params.append(jtype)

                sql += " ORDER BY created_at DESC;"
                cur.execute(sql, tuple(params))
                jobs = cur.fetchall()

                for j in jobs:
                    for field in ['responsibilities', 'requirements', 'skills']:
                        val = j.get(field)
                        if isinstance(val, str):
                            try:
                                j[field] = json.loads(val)
                            except Exception:
                                j[field] = [val] if val else []

                conn.close()
                return self._send_json({'success': True, 'count': len(jobs), 'jobs': jobs})

            # 3. Single Job details: /api/jobs/<id>
            if path.startswith('/api/jobs/'):
                job_id = path[len('/api/jobs/'):].strip()
                cur.execute("SELECT * FROM jobs WHERE id = %s;", (job_id,))
                job = cur.fetchone()
                conn.close()
                if not job:
                    return self._send_json({'success': False, 'message': 'Job not found'}, 404)

                for field in ['responsibilities', 'requirements', 'skills']:
                    val = job.get(field)
                    if isinstance(val, str):
                        try:
                            job[field] = json.loads(val)
                        except Exception:
                            job[field] = [val] if val else []

                return self._send_json({'success': True, 'job': job})

            # 4. Recruiter My Jobs list: /api/recruiter/jobs
            if path == '/api/recruiter/jobs':
                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Recruiter authorization required'}, 403)

                cur.execute("""
                    SELECT j.*, COUNT(a.id) AS applicants_count
                    FROM jobs j
                    LEFT JOIN job_applications a ON j.id = a.job_id
                    WHERE j.recruiter_id = %s
                    GROUP BY j.id
                    ORDER BY j.created_at DESC;
                """, (user['id'],))
                jobs = cur.fetchall()

                for j in jobs:
                    for field in ['responsibilities', 'requirements', 'skills']:
                        val = j.get(field)
                        if isinstance(val, str):
                            try:
                                j[field] = json.loads(val)
                            except Exception:
                                j[field] = []

                conn.close()
                return self._send_json({'success': True, 'jobs': jobs})

            # 5. Recruiter Applications: /api/recruiter/applications
            if path == '/api/recruiter/applications':
                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Recruiter authorization required'}, 403)

                job_filter = query.get('job', ['all'])[0].strip()
                status_filter = query.get('status', ['all'])[0].strip()

                sql = """
                    SELECT a.*, j.title AS job_title, j.company AS job_company, j.location AS job_location
                    FROM job_applications a
                    JOIN jobs j ON a.job_id = j.id
                    WHERE j.recruiter_id = %s
                """
                params = [user['id']]

                if job_filter and job_filter != 'all':
                    sql += " AND a.job_id = %s"
                    params.append(job_filter)

                if status_filter and status_filter != 'all':
                    sql += " AND a.status = %s"
                    params.append(status_filter)

                sql += " ORDER BY a.submitted_at DESC;"
                cur.execute(sql, tuple(params))
                apps = cur.fetchall()

                # Get status history for each application
                for app in apps:
                    cur.execute("SELECT status, note, created_at FROM application_status_history WHERE application_id = %s ORDER BY created_at ASC;", (app['id'],))
                    app['status_history'] = cur.fetchall()

                conn.close()
                return self._send_json({'success': True, 'count': len(apps), 'applications': apps})

            # 6. Candidate Applications: /api/candidate/applications
            if path == '/api/candidate/applications':
                user = self._get_auth_user()
                if not user:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Login required'}, 401)

                cur.execute("""
                    SELECT a.*, j.title AS job_title, j.company, j.logo, j.location AS job_location, j.type AS job_type, j.salary
                    FROM job_applications a
                    JOIN jobs j ON a.job_id = j.id
                    WHERE a.user_id = %s
                    ORDER BY a.submitted_at DESC;
                """, (user['id'],))
                apps = cur.fetchall()

                for app in apps:
                    cur.execute("SELECT status, note, created_at FROM application_status_history WHERE application_id = %s ORDER BY created_at ASC;", (app['id'],))
                    app['status_history'] = cur.fetchall()

                conn.close()
                return self._send_json({'success': True, 'applications': apps})

            # 7. Candidate Profile: /api/candidate/profile
            if path == '/api/candidate/profile':
                user = self._get_auth_user()
                if not user:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Login required'}, 401)

                cur.execute("SELECT * FROM candidate_profiles WHERE user_id = %s;", (user['id'],))
                profile = cur.fetchone() or {}
                profile['name'] = user['name']
                profile['email'] = user['email']
                conn.close()
                return self._send_json({'success': True, 'profile': profile})

            # 8. Candidate Saved Jobs: /api/candidate/saved-jobs
            if path == '/api/candidate/saved-jobs':
                user = self._get_auth_user()
                if not user:
                    conn.close()
                    return self._send_json({'success': True, 'saved_job_ids': []})

                cur.execute("SELECT job_id FROM saved_jobs WHERE user_id = %s;", (user['id'],))
                rows = cur.fetchall()
                conn.close()
                return self._send_json({'success': True, 'saved_job_ids': [r['job_id'] for r in rows]})

            conn.close()
            return self._send_json({'error': 'Not found'}, 404)

        except Exception as e:
            return self._send_json({'success': False, 'error': str(e)}, 500)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        payload = self._read_json()

        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            # 1. Register: /api/auth/register
            if path == '/api/auth/register':
                name = payload.get('name', '').strip()
                email = payload.get('email', '').strip().lower()
                password = payload.get('password', '').strip()
                role = payload.get('role', 'candidate').strip().lower()
                company = payload.get('company', '').strip() if role == 'recruiter' else None

                if not name or not email or not password:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Name, email and password are required'}, 400)

                if len(password) < 6:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Password must be at least 6 characters'}, 400)

                # Check existing email
                cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
                if cur.fetchone():
                    conn.close()
                    return self._send_json({'success': False, 'message': 'An account with this email already exists'}, 409)

                user_uuid = f"user:{email}"
                pw_hash = hash_password(password)

                cur.execute("""
                    INSERT INTO users (user_uuid, name, email, password_hash, role, company, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active');
                """, (user_uuid, name, email, pw_hash, role, company))
                user_id = cur.lastrowid

                # If candidate, create initial profile record
                if role == 'candidate':
                    cur.execute("""
                        INSERT INTO candidate_profiles (user_id, phone, location, headline, bio, skills)
                        VALUES (%s, %s, %s, %s, %s, %s);
                    """, (user_id, payload.get('phone', ''), payload.get('location', ''), 'Job Seeker', '', ''))

                conn.commit()
                conn.close()

                return self._send_json({
                    'success': True,
                    'message': 'Account registered successfully',
                    'user': {
                        'id': user_id,
                        'user_uuid': user_uuid,
                        'name': name,
                        'email': email,
                        'role': role,
                        'company': company
                    }
                }, 201)

            # 2. Login: /api/auth/login
            if path == '/api/auth/login':
                email = payload.get('email', '').strip().lower()
                password = payload.get('password', '').strip()

                if not email or not password:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Email and password are required'}, 400)

                pw_hash = hash_password(password)
                cur.execute("SELECT id, user_uuid, name, email, password_hash, role, company FROM users WHERE email = %s;", (email,))
                user = cur.fetchone()
                conn.close()

                if not user or user['password_hash'] != pw_hash:
                    return self._send_json({'success': False, 'message': 'Invalid email or password'}, 401)

                del user['password_hash']
                return self._send_json({
                    'success': True,
                    'message': f"Welcome back, {user['name']}!",
                    'user': user
                })

            # 3. Recruiter Post a Job: /api/jobs
            if path == '/api/jobs':
                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Only registered recruiters can post jobs'}, 403)

                title = payload.get('title', '').strip()
                company = payload.get('company', '').strip() or user.get('company', 'Company')
                category = payload.get('category', 'Technology').strip()
                location = payload.get('location', '').strip()
                work_mode = payload.get('work_mode', 'On-site').strip()
                jtype = payload.get('type', 'Full-time').strip()
                salary = payload.get('salary', '').strip()
                experience = payload.get('experience', '1-3 years').strip()
                vacancies = int(payload.get('vacancies', 1) or 1)
                education = payload.get('education', 'Bachelor Degree').strip()
                deadline = payload.get('deadline') or None
                description = payload.get('description', '').strip()

                if not title or not location or not salary or not description:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Title, location, salary, and description are required'}, 400)

                # Generate clean unique ID
                clean_title = "".join(c for c in title.lower() if c.isalnum() or c in "-_ ").replace(" ", "-")[:20]
                job_id = f"{clean_title}-{uuid.uuid4().hex[:6]}"

                responsibilities = payload.get('responsibilities', [])
                if isinstance(responsibilities, str):
                    responsibilities = [r.strip() for r in responsibilities.split('\n') if r.strip()]

                requirements = payload.get('requirements', [])
                if isinstance(requirements, str):
                    requirements = [r.strip() for r in requirements.split('\n') if r.strip()]

                skills = payload.get('skills', [])
                if isinstance(skills, str):
                    skills = [s.strip() for s in skills.split(',') if s.strip()]

                logo = company[0].upper() if company else 'J'

                cur.execute("""
                    INSERT INTO jobs (
                        id, recruiter_id, title, company, logo, category, type, work_mode, 
                        location, salary, experience, vacancies, education, deadline, 
                        description, responsibilities, requirements, skills, is_active
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1);
                """, (
                    job_id, user['id'], title, company, logo, category, jtype, work_mode,
                    location, salary, experience, vacancies, education, deadline,
                    description, json.dumps(responsibilities), json.dumps(requirements), json.dumps(skills)
                ))
                conn.commit()
                conn.close()

                return self._send_json({
                    'success': True,
                    'message': 'Job posted successfully!',
                    'job_id': job_id
                }, 201)

            # 4. Candidate Apply for a Job: /api/applications
            if path == '/api/applications':
                user = self._get_auth_user()
                if not user:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'You must be logged in to apply for a job'}, 401)

                job_id = payload.get('job_id', '').strip()
                name = payload.get('applicant_name', '').strip() or user['name']
                email = payload.get('email', '').strip() or user['email']
                phone = payload.get('phone', '').strip()
                location = payload.get('location', '').strip()
                resume_name = payload.get('resume_name', 'Resume.pdf').strip()
                resume_size = payload.get('resume_size', '1.0 MB')
                cover_letter = payload.get('cover_letter', '').strip()

                if not job_id or not phone or not location or not cover_letter:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Please fill all required application fields'}, 400)

                # Check duplicate application in MySQL
                cur.execute("SELECT id, status FROM job_applications WHERE job_id = %s AND user_id = %s;", (job_id, user['id']))
                existing = cur.fetchone()
                if existing:
                    conn.close()
                    return self._send_json({
                        'success': False,
                        'message': f"You have already submitted an application for this position (Current status: {existing['status']}). Duplicate applications are not permitted."
                    }, 409)

                app_id = f"APP-{uuid.uuid4().hex[:6].upper()}"

                cur.execute("""
                    INSERT INTO job_applications (
                        id, job_id, user_id, applicant_name, email, phone, location, 
                        resume_name, resume_size, cover_letter, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pending');
                """, (app_id, job_id, user['id'], name, email, phone, location, resume_name, resume_size, cover_letter))

                # Insert initial history record
                cur.execute("""
                    INSERT INTO application_status_history (application_id, status, note, changed_by_user_id)
                    VALUES (%s, 'Pending', 'Application submitted by candidate', %s);
                """, (app_id, user['id']))

                conn.commit()
                conn.close()

                return self._send_json({
                    'success': True,
                    'message': 'Your application was submitted successfully!',
                    'application_id': app_id
                }, 201)

            # 5. Candidate Toggle Saved Job: /api/candidate/saved-jobs
            if path == '/api/candidate/saved-jobs':
                user = self._get_auth_user()
                if not user:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Login required'}, 401)

                job_id = payload.get('job_id', '').strip()
                if not job_id:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'job_id required'}, 400)

                cur.execute("SELECT id FROM saved_jobs WHERE user_id = %s AND job_id = %s;", (user['id'], job_id))
                exists = cur.fetchone()
                if exists:
                    cur.execute("DELETE FROM saved_jobs WHERE user_id = %s AND job_id = %s;", (user['id'], job_id))
                    is_saved = False
                else:
                    cur.execute("INSERT INTO saved_jobs (user_id, job_id) VALUES (%s, %s);", (user['id'], job_id))
                    is_saved = True

                conn.commit()
                conn.close()
                return self._send_json({'success': True, 'is_saved': is_saved})

            conn.close()
            return self._send_json({'error': 'Not found'}, 404)

        except Exception as e:
            return self._send_json({'success': False, 'error': str(e)}, 500)

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        payload = self._read_json()

        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            # 1. Update application status: /api/applications/<id>/status
            if path.startswith('/api/applications/') and path.endswith('/status'):
                parts = path.split('/')
                app_id = parts[3]
                new_status = payload.get('status', '').strip()
                note = payload.get('note', f"Status updated to {new_status}").strip()

                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Only authorized recruiters can update status'}, 403)

                # Ensure this application belongs to a job posted by this recruiter
                cur.execute("""
                    SELECT a.id, a.job_id, j.recruiter_id 
                    FROM job_applications a
                    JOIN jobs j ON a.job_id = j.id
                    WHERE a.id = %s;
                """, (app_id,))
                app = cur.fetchone()
                if not app or app['recruiter_id'] != user['id']:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Permission denied: application does not belong to your jobs'}, 403)

                cur.execute("UPDATE job_applications SET status = %s WHERE id = %s;", (new_status, app_id))
                cur.execute("""
                    INSERT INTO application_status_history (application_id, status, note, changed_by_user_id)
                    VALUES (%s, %s, %s, %s);
                """, (app_id, new_status, note, user['id']))

                conn.commit()
                conn.close()
                return self._send_json({'success': True, 'message': f'Status updated to {new_status}', 'status': new_status})

            # 2. Toggle active/closed job: /api/jobs/<id>/status
            if path.startswith('/api/jobs/') and path.endswith('/status'):
                parts = path.split('/')
                job_id = parts[3]
                is_active = int(payload.get('is_active', 1))

                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Recruiter authorization required'}, 403)

                cur.execute("UPDATE jobs SET is_active = %s WHERE id = %s AND recruiter_id = %s;", (is_active, job_id, user['id']))
                conn.commit()
                conn.close()
                return self._send_json({'success': True, 'is_active': is_active})

            conn.close()
            return self._send_json({'error': 'Not found'}, 404)

        except Exception as e:
            return self._send_json({'success': False, 'error': str(e)}, 500)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        payload = self._read_json()

        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            # 1. Update Candidate Profile: /api/candidate/profile
            if path == '/api/candidate/profile':
                user = self._get_auth_user()
                if not user:
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Login required'}, 401)

                name = payload.get('fullName', '').strip() or user['name']
                phone = payload.get('phone', '').strip()
                location = payload.get('location', '').strip()
                headline = payload.get('headline', '').strip()
                bio = payload.get('bio', '').strip()
                skills = payload.get('skills', '').strip()
                degree = payload.get('degree', '').strip()
                institution = payload.get('institution', '').strip()
                graduation_year = payload.get('graduationYear', '').strip()
                portfolio_url = payload.get('portfolio', '').strip()

                cur.execute("UPDATE users SET name = %s WHERE id = %s;", (name, user['id']))
                cur.execute("""
                    INSERT INTO candidate_profiles (
                        user_id, phone, location, headline, bio, skills, degree, institution, graduation_year, portfolio_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        phone=VALUES(phone), location=VALUES(location), headline=VALUES(headline),
                        bio=VALUES(bio), skills=VALUES(skills), degree=VALUES(degree),
                        institution=VALUES(institution), graduation_year=VALUES(graduation_year),
                        portfolio_url=VALUES(portfolio_url);
                """, (user['id'], phone, location, headline, bio, skills, degree, institution, graduation_year, portfolio_url))

                conn.commit()
                conn.close()
                return self._send_json({'success': True, 'message': 'Profile updated successfully in MySQL!'})

            # 2. Recruiter Edit Job: /api/jobs/<id>
            if path.startswith('/api/jobs/'):
                job_id = path[len('/api/jobs/'):].strip()
                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Recruiter authorization required'}, 403)

                title = payload.get('title', '').strip()
                category = payload.get('category', '').strip()
                location = payload.get('location', '').strip()
                work_mode = payload.get('work_mode', 'On-site').strip()
                jtype = payload.get('type', 'Full-time').strip()
                salary = payload.get('salary', '').strip()
                experience = payload.get('experience', '1-3 years').strip()
                vacancies = int(payload.get('vacancies', 1) or 1)
                education = payload.get('education', 'Bachelor Degree').strip()
                description = payload.get('description', '').strip()

                cur.execute("""
                    UPDATE jobs SET 
                        title = %s, category = %s, location = %s, work_mode = %s,
                        type = %s, salary = %s, experience = %s, vacancies = %s,
                        education = %s, description = %s
                    WHERE id = %s AND recruiter_id = %s;
                """, (title, category, location, work_mode, jtype, salary, experience, vacancies, education, description, job_id, user['id']))

                conn.commit()
                conn.close()
                return self._send_json({'success': True, 'message': 'Job updated successfully!'})

            conn.close()
            return self._send_json({'error': 'Not found'}, 404)

        except Exception as e:
            return self._send_json({'success': False, 'error': str(e)}, 500)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            # Recruiter delete job: /api/jobs/<id>
            if path.startswith('/api/jobs/'):
                job_id = path[len('/api/jobs/'):].strip()
                user = self._get_auth_user()
                if not user or user['role'] != 'recruiter':
                    conn.close()
                    return self._send_json({'success': False, 'message': 'Recruiter authorization required'}, 403)

                cur.execute("DELETE FROM jobs WHERE id = %s AND recruiter_id = %s;", (job_id, user['id']))
                conn.commit()
                conn.close()
                return self._send_json({'success': True, 'message': 'Job deleted successfully!'})

            conn.close()
            return self._send_json({'error': 'Not found'}, 404)

        except Exception as e:
            return self._send_json({'success': False, 'error': str(e)}, 500)

if __name__ == '__main__':
    # Test DB connection on startup
    try:
        c = get_db()
        c.close()
        print(f"[OK] Connected to MySQL database '{DB_CONFIG['database']}' on port {DB_CONFIG['port']}")
    except Exception as e:
        print(f"[ERROR] Could not connect to MySQL: {e}")

    server_address = ('', PORT)
    httpd = socketserver.TCPServer(server_address, JobPortalRequestHandler)
    print(f"[OK] JobPortal Server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

