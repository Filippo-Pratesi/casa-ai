-- Add date of birth to contacts for birthday reminders
alter table contacts add column if not exists date_of_birth date;
