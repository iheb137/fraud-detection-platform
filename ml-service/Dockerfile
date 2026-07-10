FROM python:3.13-slim
RUN useradd -m -u 1001 ml
WORKDIR /ml
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt
COPY app ./app
COPY models ./models-seed
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh && mkdir -p /ml/models && chown -R ml:ml /ml
USER ml
EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]