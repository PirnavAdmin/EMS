# syntax=docker/dockerfile:1.7
 
# ==========================

# Restore

# ==========================

FROM mcr.microsoft.com/dotnet/sdk:8.0-bookworm-slim AS restore
 
WORKDIR /src
 
COPY EmployeeManagementSystem.csproj ./
 
RUN dotnet restore "EmployeeManagementSystem.csproj"
 
 
# ==========================

# Build

# ==========================

FROM restore AS build
 
COPY . .
 
RUN dotnet publish "EmployeeManagementSystem.csproj" \

    -c Release \

    -o /app/publish \

    /p:UseAppHost=false \

    --no-restore
 
 
# ==========================

# Runtime

# ==========================

FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS runtime
 
WORKDIR /app
 
ENV ASPNETCORE_URLS=http://+:8080 \

    DOTNET_RUNNING_IN_CONTAINER=true \

    HOME=/tmp
 
 
# ==========================

# Install LibreOffice + Fonts

# ==========================

RUN apt-get update && \

    apt-get install -y --no-install-recommends \

        libreoffice-writer \

        libreoffice-java-common \

        default-jre-headless \

        fontconfig \

        fonts-dejavu \

        fonts-liberation2 \

        fonts-crosextra-carlito \

        fonts-crosextra-caladea \

        fonts-noto \

        fonts-noto-cjk \

        ghostscript && \

    fc-cache -fv && \

    rm -rf /var/lib/apt/lists/*
 
 
# ==========================

# Create Required Directories

# ==========================

RUN mkdir -p \

    /app/GeneratedLetters \

    /app/GeneratedPayslips \

    /app/wwwroot/GeneratedPayslips \

    /app/wwwroot/uploads \

    /app/wwwroot/uploads/assets \

    /tmp/libreoffice-profile
 
 
# ==========================

# Copy Published Application

# ==========================

COPY --from=build /app/publish ./
 
 
# ==========================

# Copy Templates

# ==========================

COPY --from=build /src/Templates ./Templates
 
 
# ==========================

# Set Ownership

# ==========================

RUN chown -R ${APP_UID}:${APP_UID} \

    /app/GeneratedLetters \

    /app/GeneratedPayslips \

    /app/wwwroot/GeneratedPayslips \

    /app/wwwroot/uploads \

    /app/wwwroot/uploads/assets \

    /tmp/libreoffice-profile
 
 
# ==========================

# Run as Non-Root User

# ==========================

USER ${APP_UID}
 
EXPOSE 8080
 
ENTRYPOINT ["dotnet", "EmployeeManagementSystem.dll"]
 