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

WORKDIR /src

COPY . .

RUN dotnet publish "EmployeeManagementSystem.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ==========================
# Runtime
# ==========================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS runtime

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    HOME=/tmp

# Install LibreOffice
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice \
        libreoffice-writer \
        fonts-dejavu \
        fontconfig && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./
COPY --from=build /src/Templates ./Templates

RUN mkdir -p \
    /app/GeneratedLetters \
    /app/GeneratedPayslips \
    /app/wwwroot/GeneratedPayslips \
    /app/wwwroot/uploads \
    /app/wwwroot/uploads/assets && \
    chown -R ${APP_UID}:${APP_UID} /app

USER ${APP_UID}

EXPOSE 8080

ENTRYPOINT ["dotnet", "EmployeeManagementSystem.dll"]
