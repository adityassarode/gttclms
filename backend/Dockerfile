FROM maven:3.9.9-eclipse-temurin-17

WORKDIR /app

COPY . .

RUN mvn clean package -Dmaven.test.skip=true

EXPOSE 8080

CMD ["java", "-jar", "target/gttc-lms-0.0.1-SNAPSHOT.jar"]