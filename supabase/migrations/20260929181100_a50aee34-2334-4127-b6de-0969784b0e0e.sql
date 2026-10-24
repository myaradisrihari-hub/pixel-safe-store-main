REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_publish_product() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_purchased(uuid, uuid) FROM anon;