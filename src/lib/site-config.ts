/**
 * Controls temporary closure of the public Storefront (/books, /cart)
 * and Reader registration/login (/account, reader sign-up/sign-in)
 * while the store catalog is being prepared.
 * Author, Publisher, and Admin portals remain fully active.
 */
export const STORE_AND_READER_CLOSED = true;

/**
 * Set to true only after enabling the Google OAuth provider in Supabase Dashboard
 * (Authentication -> Providers -> Google) with valid Client ID & Secret.
 */
export const GOOGLE_OAUTH_ENABLED = false;
