FROM node:24-bookworm-slim
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter
WORKDIR /app
ENV NODE_ENV=production PORT=8080 AWS_LWA_PORT=8080 AWS_LWA_READINESS_CHECK_PATH=/auth/user AWS_LWA_READINESS_CHECK_HEALTHY_STATUS=200 AWS_LWA_ASYNC_INIT=true
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY models ./models
USER node
EXPOSE 8080
CMD ["node", "server.js"]
