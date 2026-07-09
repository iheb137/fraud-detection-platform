@echo off
cd /d C:\Users\saafi\fraud-detection-platform\backend\backend
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=-Dspring.datasource.url=jdbc:postgresql://localhost:5432/fraud_detection -Dspring.datasource.username=postgres -Dspring.datasource.password=iheb -Dspring.jpa.hibernate.ddl-auto=none"