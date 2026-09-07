# Walkthrough - Docker Support and Dark Slate Grey Theme for Disk Usage Analyzer

I have updated the `Disk-Useage` project with a new **Dark Slate Grey** theme and enabled Docker support for easy deployment.

## Changes Made

### UI & Theme
- **[index.html](file:///Users/jim/Disk-Useage/public/index.html)**:
  - Updated the CSS to use **Dark Slate Grey** (`#2F4F4F`) as the primary background color.
  - Adjusted container, chart, and table styles to complement the new theme for better legibility and aesthetics.
- **[script.js](file:///Users/jim/Disk-Useage/public/script.js)**:
  - Updated Chart.js default colors and border colors to match the new dark theme.

### Docker Integration
- **[Dockerfile](file:///Users/jim/Disk-Useage/Dockerfile)**:
  - Added a standard Node.js environment for the application.
- **[.dockerignore](file:///Users/jim/Disk-Useage/.dockerignore)**:
  - Excluded unnecessary files like `node_modules`, `.git`, and system-specific files to keep the image slim.
- **[docker-compose.yml](file:///Users/jim/Disk-Useage/docker-compose.yml)**:
  - Defined the `disk-usage` service.
  - Mapped port `8888`.
  - Configured a read-only volume mount of the host's root filesystem to `/host`, allowing you to analyze the host's disk from within the container.

### Documentation
- **[README.md](file:///Users/jim/Disk-Useage/README.md)**:
  - Added a new **Docker** section under "Running the Application" with instructions for building and usage, including how to scan the host machine.

## Verification Results

The application is now ready to be run via:
```bash
docker compose up -d --build
```

> [!TIP]
> The app defaults to `/host_root` on startup. This is a read-only mapping of your actual machine's disk. You can navigate through it just like a normal filesystem.
