# Stufe 1: Anwendung bauen
FROM eclipse-temurin:25-jdk AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y maven \
    && rm -rf /var/lib/apt/lists/*

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Stufe 2: Anwendung ausführen
FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=build /app/target/woodchain-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "--enable-native-access=ALL-UNNAMED", "-jar", "app.jar"]