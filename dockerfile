# Step 1: Build React App
FROM node:18 as build
WORKDIR /usr/app

COPY package*.json ./

RUN npm install --force

COPY . .

RUN npm run build
# Step 2: Serve with Nginx
FROM nginx:alpine

RUN apk add --update --no-cache bash jq

WORKDIR /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /usr/app/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]