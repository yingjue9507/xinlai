"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const phoneNumber = '13800000000';
    const password = '123456';
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const existingUser = await prisma.user.findUnique({
        where: { phoneNumber },
    });
    if (!existingUser) {
        await prisma.user.create({
            data: {
                phoneNumber,
                password: hashedPassword,
            },
        });
        console.log(`Test user created: ${phoneNumber} / ${password}`);
    }
    else {
        console.log(`Test user already exists: ${phoneNumber}`);
        // 如果需要重置密码确保可用，可以取消注释下面代码
        // await prisma.user.update({
        //   where: { phoneNumber },
        //   data: { password: hashedPassword }
        // });
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
//# sourceMappingURL=seed-user.js.map