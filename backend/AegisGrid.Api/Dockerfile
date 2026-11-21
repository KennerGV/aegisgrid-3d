FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["AegisGrid.Api.csproj", "./"]
RUN dotnet restore "AegisGrid.Api.csproj"

COPY . .
RUN dotnet publish "AegisGrid.Api.csproj" -c Release -warnaserror -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000
ENV DOTNET_EnableDiagnostics=0

USER $APP_UID
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AegisGrid.Api.dll"]
