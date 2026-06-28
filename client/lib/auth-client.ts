import {createAuthClient} from 'better-auth/react';
import { deviceAuthorizationClient } from 'better-auth/client/plugins';

export const authclient = createAuthClient({
    baseURL:"http://localhost:3005",
    plugins:[
        deviceAuthorizationClient()
    ]
})