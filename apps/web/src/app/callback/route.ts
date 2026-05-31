import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
    baseURL: process.env.BASE_URL,
    returnPathname: '/',
});
