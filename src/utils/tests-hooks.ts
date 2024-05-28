import { disconnect, getConnection } from "../services/db/connection";

export const mochaHooks = {
  afterAll() {
    // Disconnect from the database
    return disconnect(getConnection());
  },
};
