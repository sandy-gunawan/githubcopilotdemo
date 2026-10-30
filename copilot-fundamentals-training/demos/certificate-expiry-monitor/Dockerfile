FROM python:3.13-slim@sha256:2d44738ebf4ce5f63b9d9ea871e9c7cfdc0426f7b0c97cac915fd88ded1d86bb

LABEL com.azure.containerizationassist.createdby="containerization-assist"

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt .
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN python -m pip install --no-cache-dir --requirement requirements.txt \
    && useradd --no-create-home --uid 10001 --shell /usr/sbin/nologin appuser

COPY --chown=appuser:appuser certificate_monitor ./certificate_monitor

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD ["python", "-c", "import json; from urllib.request import urlopen; response = urlopen('http://127.0.0.1:8080/healthz', timeout=2); assert response.status == 200 and json.load(response) == {'status': 'ok', 'mode': 'demo'}"]

CMD ["waitress-serve", "--listen=0.0.0.0:8080", "--call", "certificate_monitor:create_app"]
