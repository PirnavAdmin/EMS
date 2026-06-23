# syntax=docker/dockerfile:1.7
 
FROM mcr.microsoft.com/dotnet/sdk:8.0-bookworm-slim AS restore
 
WORKDIR /src
 
COPY EmployeeManagementSystem.csproj ./

RUN dotnet restore "EmployeeManagementSystem.csproj"
 
FROM restore AS build
 
COPY . ./

RUN dotnet publish "EmployeeManagementSystem.csproj" \

    --configuration Release \

    --output /app/publish \

    /p:UseAppHost=false
 
FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS runtime
 
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \

    DOTNET_RUNNING_IN_CONTAINER=true
 
RUN apt-get update \
&& apt-get install -y --no-install-recommends \

        fontconfig \

        fonts-dejavu \

        libreoffice-writer \
&& rm -rf /var/lib/apt/lists/*
 
COPY --from=build /app/publish ./

COPY --from=build /src/Templates ./Templates

RUN mkdir -p \

    /app/GeneratedLetters \

    /app/GeneratedPayslips \

    /app/wwwroot/GeneratedPayslips \

    /app/wwwroot/uploads \

    /app/wwwroot/uploads/assets \
&& chown -R ${APP_UID}:${APP_UID} /app
 
USER ${APP_UID}
 
EXPOSE 8080

ENTRYPOINT ["dotnet", "EmployeeManagementSystem.dll"]

 
