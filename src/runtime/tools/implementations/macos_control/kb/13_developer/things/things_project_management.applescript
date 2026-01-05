---
id: things_project_management
title: Advanced Project Management with Things
description: Script for managing complex projects in Things with milestones and tracking
---
-- Create a new managed project with milestones
createManagedProject("Website Redesign", "Redesign company website", "2024-08-15", "Work")

-- Add milestones and tasks to a project
addMilestoneToProject("Website Redesign", "Design Phase", "2024-06-01")
addTaskToMilestone("Website Redesign", "Design Phase", "Create wireframes", "2024-05-25")

-- Generate project report
generateProjectReport("Website Redesign")

-- Create a project from template
createProjectFromTemplate("Marketing Campaign", "Marketing", "2024-07-01")
