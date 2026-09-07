# Implementation Plan - Dockerize and Theme Update for Disk Usage Analyzer

Dockerize the `Disk-Useage` project and update its default theme to **Dark Slate Grey**.

## User Review Required

> [!NOTE]
> For the theme update, I will use `#2F4F4F` (Dark Slate Grey) as the primary background color for the body and adjust the container and chart background colors to complementary darker shades to maintain legibility.

## Proposed Changes

### [Frontend]

#### [MODIFY] [index.html](file:///Users/jim/Disk-Useage/public/index.html)
- Update CSS styles to use **Dark Slate Grey** theme.
- Specifically, update `body`, `.container`, `.chart-container`, and table headers.

### [Docker]

#### [NEW] [Dockerfile](file:///Users/jim/Disk-Useage/Dockerfile)
- Use `node:20-slim` as the base image.
- Copy `package.json` and `package-lock.json`.
- Run `npm install`.
- Copy the rest of the source code.
- Expose port `8888`.
- Start the server using `npm start`.

#### [NEW] [.dockerignore](file:///Users/jim/Disk-Useage/.dockerignore)
- Exclude `node_modules`, `.git`, etc.

#### [NEW] [docker-compose.yml](file:///Users/jim/Disk-Useage/docker-compose.yml)
- Define a service for `disk-usage`.
- Map port `8888:8888`.
- Mount the host root filesystem (read-only) to allow scanning from within the container.
- Note: To scan the host system, we will need to provide the host path in the UI.

### [Documentation]

#### [MODIFY] [README.md](file:///Users/jim/Disk-Useage/README.md)
- Add instructions for running with Docker.

## Verification Plan

### Manual Verification
- Build and run the Docker container: `docker compose up -d --build`.
- Access the UI at `http://localhost:8888`.
- Verify the new **Dark Slate Grey** theme is applied.
- Test scanning a directory to ensure it works within the container.
