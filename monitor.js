const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

setInterval(async () => {
    const grouped = await prisma.contents.groupBy({
        by: ['status'],
        _count: {
            status: true,
        },
    });

    const formatted = grouped.map((item) => ({
        status: item.status,
        total: item._count.status,
    }));

    console.clear();

    console.table(formatted);
}, 1000);
