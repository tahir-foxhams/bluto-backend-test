# build stage 
FROM node:20-alpine as build-stage

# Set the working directory in the container
WORKDIR /usr/src/app 

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the React app
#RUN npm run dev

# Run Prisma database migrations and seed data
RUN npx prisma migrate deploy  
# RUN npx prisma migrate dev --name init       

# Generate Prisma client
RUN npx prisma generate  

#Run DB seeder
RUN npx prisma db seed             

# Expose port 80 for the application
EXPOSE 3001

# Specify the command to run your application
CMD ["npm", "start"]
