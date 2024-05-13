ARG IMAGE=node:20-alpine

FROM $IMAGE

ARG CONFIG
ARG PROCESS
ARG DIR_NAME
ENV PROCESS ${PROCESS}

# Create app directory
WORKDIR /etc/service/

# Bundle app source
COPY . .

RUN npm install