# Foxhams-Node-Typescript-Phase3

A TypeScript-based Node.js backend using Express and Prisma ORM.

## Setup Instructions

1. **Install dependencies**  
   Run the following command to install all required packages:

   ```bash
   npm install
   ```

2. **Configure environment variables**  
   Create a `.env` file based on the provided `.env.example` and fill in the necessary values.

3. **Run Prisma database migrations**  
   This will create and apply your database schema:

   ```bash
    npx prisma migrate dev --name init
   ```

4. **Generate Prisma client**  
   This regenerates the Prisma client based on your schema:

   ```bash
    npx prisma generate
   ```

5. **Set up Mailgun templates**  
    Go to your Mailgun account, and create templates for the emails. The email templates are located in the `email-templates` folder. Upload these templates to your Mailgun account. Use the appropriate Mailgun template name as the file name that reference your created template.

   **Important**: Use the name of the template as the file name in the email-templates folder when uploading to Mailgun. For example, if the file is named welcome-template.html, use welcome-template as the Mailgun template name.

6. **Start the development server**  
   Run the server in development mode:

   ```bash
    npm run dev
   ```

## Key Points to Remember Before Starting the Server:

### .env Setup:

Make sure the *`.env`* file is correctly created from *`.env-example`* with all necessary values filled in.
