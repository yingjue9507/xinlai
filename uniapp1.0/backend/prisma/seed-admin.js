"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const username = 'admin';
    const password = '123456';
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const existingAdmin = await prisma.adminUser.findUnique({
        where: { username },
    });
    if (!existingAdmin) {
        await prisma.adminUser.create({
            data: {
                username,
                password: hashedPassword,
            },
        });
        console.log('Admin user created: admin / 123456');
    }
    else {
        console.log('Admin user already exists');
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-admin.js.map