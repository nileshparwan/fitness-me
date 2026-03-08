import { redirect } from "next/navigation";

import {
  CLIENT_PORTAL_HOME_PATH,
  CLIENT_PORTAL_LOGIN_PATH,
  type ClientModuleKey,
} from "@/lib/client-portal/constants";
import {
  canReadModule,
  canWriteModule,
  getClientPortalContext,
  getModuleAccessLevel,
  type ClientPortalContext,
} from "@/lib/client-portal/session";

async function requireClientPortalContext(): Promise<ClientPortalContext> {
  const context = await getClientPortalContext();
  if (!context) {
    redirect(CLIENT_PORTAL_LOGIN_PATH);
  }
  return context;
}

export async function requireClientModuleAccess(
  moduleKey: ClientModuleKey,
  options?: { write?: boolean }
) {
  const context = await requireClientPortalContext();
  const level = getModuleAccessLevel(context.features, moduleKey);

  if (!canReadModule(level)) {
    redirect(`${CLIENT_PORTAL_HOME_PATH}?noAccess=${moduleKey}`);
  }

  if (options?.write && !canWriteModule(level)) {
    redirect(`${CLIENT_PORTAL_HOME_PATH}?readOnly=${moduleKey}`);
  }

  return {
    context,
    accessLevel: level,
    readOnly: !canWriteModule(level),
  };
}
