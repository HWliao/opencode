# TUI Should Support Project Management And Switching

**Status:** 未开始

## Summary

The TUI should provide project management similar to the web app, allowing users to open a new directory as a project and switch directly between existing projects from inside the TUI.

## Requirements

1. Support opening a new filesystem directory as a project directly from the TUI.
2. Support switching between existing projects directly in the TUI.
3. Do not support project deletion in this flow.
4. Support Windows filesystem directories, including Windows absolute path formats.
5. Keep the overall interaction model close to the web app's project management experience.
6. Display each project with both name and directory information.

## Project Display

Project display name should use this priority:

1. Use `project.name` when available.
2. Otherwise use the basename of the project directory.

The directory should still be visible so users can distinguish projects with the same display name or basename.

## Expected Behavior

Users should be able to manage project selection without restarting the TUI or relying on `/move` or `/warp`, since those commands operate within the current project boundary rather than switching the whole TUI to another project.

## Out Of Scope

Project deletion is explicitly out of scope for this issue.

## Notes

This issue records the desired product behavior only. Implementation approach, API changes, persistence model, and exact UI layout are still to be designed.
