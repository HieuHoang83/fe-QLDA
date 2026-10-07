import { haravanRequest } from "./haravan";

export interface HaravanCustomCollection {
  id?: number;
  title?: string;
  handle?: string;
  body_html?: string | null;
  published_at?: string | null;
  sort_order?: string | null;
  products_count?: number;
  image?: { src?: string; alt?: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface HaravanCustomCollectionListResult {
  collections: HaravanCustomCollection[];
  count?: number;
}

export interface HaravanCustomCollectionResult {
  collection: HaravanCustomCollection;
}

export interface HaravanCollect {
  id?: number;
  product_id?: number;
  collection_id?: number;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HaravanCollectListResult {
  collects: HaravanCollect[];
  count?: number;
}

export interface HaravanCollectResult {
  collect: HaravanCollect;
}

export interface ListCollectionsParams {
  page?: number;
  limit?: number;
  ids?: string;
  title?: string;
  handle?: string;
  fields?: string;
  [key: string]: string | number | undefined;
}

export interface ListCollectsParams {
  page?: number;
  limit?: number;
  ids?: string;
  collection_id?: string | number;
  product_id?: string | number;
  fields?: string;
  [key: string]: string | number | undefined;
}

export type CustomCollectionPayload = Partial<
  Pick<
    HaravanCustomCollection,
    "title" | "handle" | "body_html" | "sort_order" | "published_at"
  >
>;

export type CollectPayload = Partial<
  Pick<HaravanCollect, "product_id" | "collection_id" | "position">
>;

export function listCustomCollections(
  token: string,
  orgId: string,
  params: ListCollectionsParams = {}
): Promise<HaravanCustomCollectionListResult> {
  return haravanRequest<HaravanCustomCollectionListResult>(
    orgId,
    "/custom_collections",
    token,
    { params }
  );
}

export function countCustomCollections(
  token: string,
  orgId: string
): Promise<{ count: number }> {
  return haravanRequest(orgId, "/custom_collections/count", token);
}

export function getCustomCollection(
  token: string,
  orgId: string,
  collectionId: number
): Promise<HaravanCustomCollectionResult> {
  return haravanRequest(orgId, `/custom_collections/${collectionId}`, token);
}

export function createCustomCollection(
  token: string,
  orgId: string,
  collection: CustomCollectionPayload
): Promise<HaravanCustomCollectionResult> {
  return haravanRequest(orgId, "/custom_collections", token, {
    method: "POST",
    body: { collection },
  });
}

export function updateCustomCollection(
  token: string,
  orgId: string,
  collectionId: number,
  collection: CustomCollectionPayload
): Promise<HaravanCustomCollectionResult> {
  return haravanRequest(orgId, `/custom_collections/${collectionId}`, token, {
    method: "PUT",
    body: { collection: { id: collectionId, ...collection } },
  });
}

export function deleteCustomCollection(
  token: string,
  orgId: string,
  collectionId: number
): Promise<unknown> {
  return haravanRequest(
    orgId,
    `/custom_collections/${collectionId}`,
    token,
    { method: "DELETE", body: {} }
  );
}

export function listCollects(
  token: string,
  orgId: string,
  params: ListCollectsParams = {}
): Promise<HaravanCollectListResult> {
  return haravanRequest<HaravanCollectListResult>(orgId, "/collects", token, {
    params,
  });
}

export function countCollects(
  token: string,
  orgId: string,
  params: ListCollectsParams = {}
): Promise<{ count: number }> {
  return haravanRequest(orgId, "/collects/count", token, { params });
}

export function createCollect(
  token: string,
  orgId: string,
  collect: CollectPayload
): Promise<HaravanCollectResult> {
  return haravanRequest(orgId, "/collects", token, {
    method: "POST",
    body: { collect },
  });
}

export function deleteCollect(
  token: string,
  orgId: string,
  collectId: number
): Promise<unknown> {
  return haravanRequest(orgId, `/collects/${collectId}`, token, {
    method: "DELETE",
    body: {},
  });
}
