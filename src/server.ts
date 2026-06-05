import 'dotenv/config';
import app from './app';
import { prisma } from './prisma';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    try {
        // Attempt DB connection
        await prisma.$connect();
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();
