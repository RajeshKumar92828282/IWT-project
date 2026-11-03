-- =====================================================================
-- JobPortal Database Schema (MySQL 8.0+ / MariaDB)
-- Project: Academic Job Portal Full-Stack Architectural Specification
-- Database Name: jobportal_db
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `jobportal_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `jobportal_db`;

-- 1. Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_uuid` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('candidate', 'recruiter', 'admin') NOT NULL DEFAULT 'candidate',
  `company` VARCHAR(120) NULL,
  `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: candidate_profiles
CREATE TABLE IF NOT EXISTS `candidate_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `phone` VARCHAR(25) NULL,
  `location` VARCHAR(100) NULL,
  `headline` VARCHAR(180) NULL,
  `bio` TEXT NULL,
  `skills` TEXT NULL,
  `degree` VARCHAR(120) NULL,
  `institution` VARCHAR(150) NULL,
  `graduation_year` VARCHAR(10) NULL,
  `portfolio_url` VARCHAR(255) NULL,
  `resume_path` VARCHAR(255) NULL,
  `resume_filename` VARCHAR(150) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_candidate_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: jobs
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `recruiter_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `company` VARCHAR(120) NOT NULL,
  `logo` VARCHAR(10) DEFAULT 'J',
  `category` VARCHAR(50) NOT NULL,
  `type` ENUM('Full-time', 'Part-time', 'Internship', 'Contract') NOT NULL DEFAULT 'Full-time',
  `work_mode` ENUM('Remote', 'Hybrid', 'On-site') NOT NULL DEFAULT 'On-site',
  `location` VARCHAR(100) NOT NULL,
  `salary` VARCHAR(60) NOT NULL,
  `experience` VARCHAR(50) DEFAULT '1-3 years',
  `vacancies` INT DEFAULT 1,
  `education` VARCHAR(100) DEFAULT 'Bachelor Degree',
  `deadline` DATE NULL,
  `description` TEXT NOT NULL,
  `responsibilities` JSON NULL,
  `requirements` JSON NULL,
  `skills` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_job_recruiter` 
    FOREIGN KEY (`recruiter_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_jobs_category` (`category`),
  INDEX `idx_jobs_type` (`type`),
  INDEX `idx_jobs_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: job_applications
CREATE TABLE IF NOT EXISTS `job_applications` (
  `id` VARCHAR(30) PRIMARY KEY,
  `job_id` VARCHAR(50) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `applicant_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `resume_name` VARCHAR(150) NOT NULL,
  `resume_size` VARCHAR(20) DEFAULT '1.0 MB',
  `cover_letter` TEXT NOT NULL,
  `status` ENUM('Applied', 'Pending', 'Under Review', 'Shortlisted', 'Interview', 'Hired', 'Rejected') NOT NULL DEFAULT 'Applied',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_app_job` 
    FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_app_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_candidate_job` (`job_id`, `user_id`),
  INDEX `idx_app_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: application_status_history
CREATE TABLE IF NOT EXISTS `application_status_history` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `application_id` VARCHAR(30) NOT NULL,
  `status` ENUM('Applied', 'Pending', 'Under Review', 'Shortlisted', 'Hired', 'Rejected') NOT NULL,
  `note` VARCHAR(255) NULL,
  `changed_by_user_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_history_app` 
    FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_history_user` 
    FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: saved_jobs
CREATE TABLE IF NOT EXISTS `saved_jobs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `job_id` VARCHAR(50) NOT NULL,
  `saved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_saved_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_saved_job` 
    FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_user_saved_job` (`user_id`, `job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Seeds
INSERT INTO `users` (`id`, `user_uuid`, `name`, `email`, `password_hash`, `role`, `company`) VALUES
(1, 'user:candidate@example.com', 'Priya Sharma', 'candidate@example.com', '26b864a2c9183413ebceb2e1bf84c30c80d859d08e7ff91bc9a68da2f84bf3ea', 'candidate', NULL),
(2, 'user:recruiter@example.com', 'Alex Morgan', 'recruiter@example.com', '26b864a2c9183413ebceb2e1bf84c30c80d859d08e7ff91bc9a68da2f84bf3ea', 'recruiter', 'Google')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `candidate_profiles` (`user_id`, `phone`, `location`, `headline`, `bio`, `skills`, `degree`, `institution`, `graduation_year`, `portfolio_url`) VALUES
(1, '+91 98765 43210', 'Bengaluru, India', 'Frontend & Web Enthusiast', 'Passionate computer applications student specializing in modern web design and interactive UI development.', 'HTML5, CSS3, JavaScript, React, Git, Responsive Web Design', 'Bachelor of Computer Applications (BCA)', 'Bangalore University', '2026', 'https://github.com/example-priya')
ON DUPLICATE KEY UPDATE `phone` = VALUES(`phone`);

INSERT INTO `jobs` (`id`, `recruiter_id`, `title`, `company`, `logo`, `category`, `type`, `work_mode`, `location`, `salary`, `description`, `skills`) VALUES
('frontend', 2, 'Frontend Developer', 'Google', 'G', 'Technology', 'Full-time', 'Hybrid', 'Bengaluru', '₹8–14 LPA', 'Build responsive web interfaces, create accessible user experiences, and collaborate with product teams to deliver high-performance web applications.', '["HTML5", "CSS3", "JavaScript", "React", "Git"]'),
('designer', 2, 'UI/UX Designer', 'Design Studio', 'D', 'Design', 'Full-time', 'Remote', 'Remote', '₹6–10 LPA', 'Create intuitive, user-centered digital experiences by conducting user research, crafting wireframes, and designing polished interface systems.', '["Figma", "UI/UX", "Wireframing", "Prototyping"]'),
('intern', 2, 'Software Engineer Intern', 'Amazon', 'A', 'Technology', 'Internship', 'On-site', 'Hyderabad', '₹30–50K/mo', 'Learn industry software development practices while contributing to real engineering services, writing tests, and collaborating with mentors.', '["DSA", "Java", "OOP", "SQL", "Git"]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `job_applications` (`id`, `job_id`, `user_id`, `applicant_name`, `email`, `phone`, `location`, `resume_name`, `resume_size`, `cover_letter`, `status`, `submitted_at`) VALUES
('APP-1001', 'frontend', 1, 'Priya Sharma', 'candidate@example.com', '+91 98765 43210', 'Bengaluru, India', 'Priya_Sharma_Frontend_Resume.pdf', '1.2 MB', 'Dear Hiring Team, I am an enthusiastic developer passionate about creating responsive, high-performance web applications using modern HTML5, CSS3, and JavaScript.', 'Shortlisted', '2026-10-24 10:30:00')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
