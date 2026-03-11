FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/SecureBankingApp/SecureBankingApp.csproj ./SecureBankingApp/
RUN dotnet restore ./SecureBankingApp/SecureBankingApp.csproj
COPY src/SecureBankingApp/ ./SecureBankingApp/
RUN dotnet publish ./SecureBankingApp/SecureBankingApp.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "SecureBankingApp.dll"]
