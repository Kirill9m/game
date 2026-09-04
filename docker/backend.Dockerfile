# ---- Этап сборки (Maven + JDK 26) ----
FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /app

# Сначала только pom.xml, чтобы слой с зависимостями кэшировался между сборками
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline || true

COPY src src
RUN mvn -B -ntp -Dmaven.test.skip=true package

# ---- Этап запуска (только JRE) ----
FROM eclipse-temurin:26-jre-noble
WORKDIR /app

COPY --from=build /app/target/game-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]