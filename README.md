# Financial Tracker Application

A simple web application to track and forecast personal finances.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Running with Docker

There are two recommended methods to build and run this application using Docker:

### Method 1: Using `docker run`

1.  **Build the Docker image:**
    Open your terminal in the project root directory (where the `Dockerfile` is located) and run:
    ```bash
    docker build -t financial-tracker-app .
    ```
    This command builds the Docker image from the `Dockerfile` and tags it with the name `financial-tracker-app`.

2.  **Run the Docker container:**
    After the image is built successfully, run the following command to start the container:
    ```bash
    docker run -d -p 8080:80 --name financial-tracker financial-tracker-app
    ```
    Explanation of flags:
    *   `-d`: Runs the container in detached mode (in the background).
    *   `-p 8080:80`: Maps port 8080 on your host machine to port 80 inside the container (where Nginx serves the app).
    *   `--name financial-tracker`: Assigns a friendly name to the running container for easier management.
    *   `financial-tracker-app`: The name of the image to run.

3.  **Access the application:**
    Open your web browser and navigate to [http://localhost:8080](http://localhost:8080).

4.  **To stop the container:**
    ```bash
    docker stop financial-tracker
    ```

5.  **To remove the container:**
    ```bash
    docker rm financial-tracker
    ```

### Method 2: Using `docker-compose`

This method uses the `docker-compose.yml` file to manage the application's services.

1.  **Build and run the application:**
    Open your terminal in the project root directory (where `docker-compose.yml` is located) and run:
    ```bash
    docker-compose up -d
    ```
    This command will:
    *   Build the image if it doesn't exist or if changes are detected (as defined in `docker-compose.yml`).
    *   Start the container(s) in detached mode (`-d`).
    The service name `financial-tracker-app` and its configuration (including port mapping `8080:80` and container name `financial-tracker`) are defined in the `docker-compose.yml` file.

2.  **Access the application:**
    Open your web browser and navigate to [http://localhost:8080](http://localhost:8080).

3.  **To stop and remove the application's services:**
    ```bash
    docker-compose down
    ```
    This command stops and removes the containers, networks, and volumes defined in the `docker-compose.yml` file.

---

This application is a single-page React application built with Vite and styled with Tailwind CSS. It provides a 90-day financial forecast based on user-defined incomes, bills, and debts.
