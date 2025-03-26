#!/bin/sh

docker rm ${SERVICE_FRONTEND_RAG_PY}

docker run \
    --name ${SERVICE_FRONTEND_RAG_PY} \
    --env-file .env \
    --mount type=bind,source="./app",target=/app/app \
    -p ${PORT_FRONTEND_RAG_PY}:${PORT_FRONTEND_RAG_PY} ${SERVICE_FRONTEND_RAG_PY}