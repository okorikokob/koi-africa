import assert from "node:assert/strict";
import test from "node:test";
import { findVerifiedGalleryImageIndex } from "@/lib/product-gallery-selection";

const gallery = [
  "https://static.nike.com/burgundy-front.jpg?width=800",
  "https://static.nike.com/burgundy-back.jpg",
];

test("switches only to a verified colour image in the product gallery", () => {
  assert.equal(findVerifiedGalleryImageIndex(
    gallery,
    ["https://static.nike.com/burgundy-back.jpg"],
  ), 1);
  assert.equal(findVerifiedGalleryImageIndex(
    gallery,
    ["https://static.nike.com/burgundy-front.jpg"],
  ), 0);
});

test("keeps the current gallery when an alternative colour has no verified images", () => {
  assert.equal(findVerifiedGalleryImageIndex(gallery, []), null);
  assert.equal(findVerifiedGalleryImageIndex(
    gallery,
    ["https://static.nike.com/unverified-black.jpg"],
  ), null);
});
