import assert from "node:assert/strict"
import test from "node:test"
import {
  articlePath,
  assembleBlog,
  blogKeywords,
  contentBlocks,
  emptyBlogState,
  findArticle,
  parseKeywordList,
  postProblem,
  programmaticPosts,
  publicArticles,
  searchGuides,
  removePost,
  savePost,
  type BlogPost,
} from "./blog"
import { scaledSize } from "./image-scale"
import type { Business } from "./types"

const sectors = [
  { id: "yeme", label: "Yeme-İçme", photo: "/photos/lokanta.jpg" },
  { id: "oto", label: "Otomotiv", photo: "/photos/repair.jpg" },
]

test("long edge scales to 1600 and small images stay", () => {
  assert.deepEqual(scaledSize(3200, 2000), { width: 1600, height: 1000 })
  assert.deepEqual(scaledSize(800, 600), { width: 800, height: 600 })
  assert.deepEqual(scaledSize(1000, 2000), { width: 800, height: 1600 })
})

test("programmatic pages need three businesses and keep category hierarchy", () => {
  const businesses = [
    ...Array.from({ length: 3 }, (_, index) => business("yeme", "İstanbul", `Kadıköy ${index}`, `ist-${index}`)),
    ...Array.from({ length: 2 }, (_, index) => business("oto", "İstanbul", "Beşiktaş", `oto-${index}`)),
    ...Array.from({ length: 3 }, (_, index) => business("yeme", "Zonguldak", "Merkez", `zong-${index}`)),
  ]
  const posts = programmaticPosts(businesses, sectors)
  assert.deepEqual(
    posts.map((post) => post.slug).sort(),
    ["istanbul-yeme-icme", "zonguldak-yeme-icme"],
  )
  const document = assembleBlog(emptyBlogState(), businesses, sectors)
  const article = findArticle(document, "sehir-rehberleri", "istanbul", "istanbul-yeme-icme")
  assert.ok(article)
  assert.equal(article.categoryName, "Şehir rehberleri")
  assert.equal(article.subcategoryName, "İstanbul")
  assert.equal(articlePath(article), "/blog/sehir-rehberleri/istanbul/istanbul-yeme-icme")
  assert.ok(article.image)
  assert.equal(article.related?.length, 3)
  assert.equal(publicArticles(document).some((item) => item.slug === "kahvalti-yeri-nasil-secilir"), true)
  const blocks = contentBlocks(article.body)
  assert.ok(blocks.some((block) => block.type === "ul"))
  const guide = findArticle(document, "rehber", "secim", "kahvalti-yeri-nasil-secilir")
  assert.equal(contentBlocks(guide?.body ?? "").find((block) => block.type === "ul")?.items.length, 5)
})

test("admin can hide a generated page and add a post with an image", () => {
  const businesses = Array.from({ length: 3 }, (_, index) => business("yeme", "İstanbul", "Kadıköy", `ist-${index}`))
  const hidden = removePost(emptyBlogState(), "prog-istanbul-yeme")
  const document = assembleBlog(hidden, businesses, sectors)
  assert.equal(findArticle(document, "sehir-rehberleri", "istanbul", "istanbul-yeme-icme"), null)
  const draft: BlogPost = {
    id: "custom-1",
    slug: "yeni-not",
    categoryId: "cat-rehber",
    subcategoryId: "sub-secim",
    title: "Yeni not",
    description: "Kısa açıklama",
    body: "Gövde",
    image: "",
    imageAlt: "",
    published: true,
    kind: "custom",
    publishedAt: "2026-10-10",
    updatedAt: "2026-10-10",
  }
  assert.match(postProblem(document, draft) ?? "", /görsel/i)
  const saved = savePost(hidden, { ...draft, image: "/photos/cafe.jpg", imageAlt: "Kafe masası" }, businesses, sectors)
  assert.equal(saved.error, null)
  const next = assembleBlog(saved.state, businesses, sectors)
  assert.equal(findArticle(next, "rehber", "secim", "yeni-not")?.title, "Yeni not")
})

test("assistant guide search stays on published Pinwego posts", () => {
  const document = assembleBlog(emptyBlogState(), [], sectors)
  const breakfast = searchGuides(publicArticles(document), "Kahvaltı yeri nasıl seçilir")
  assert.equal(breakfast[0]?.href, "/blog/rehber/secim/kahvalti-yeri-nasil-secilir")
  const plumber = searchGuides(publicArticles(document), "Tesisat teklifinde ne olmalı")
  assert.equal(plumber.some((item) => item.href.endsWith("/usta-teklifinde-ne-olmali")), true)
  const hidden = document.articles.map((article) => ({ ...article, published: false }))
  assert.equal(searchGuides(hidden, "Kahvaltı yeri nasıl seçilir").length, 0)
  assert.equal(searchGuides(publicArticles(document), "zzzz qqqq").length, 0)
})

test("need guides answer the five brief sentences through their keywords", () => {
  const document = assembleBlog(emptyBlogState(), [], sectors)
  const articles = publicArticles(document)
  const expect: [string, string][] = [
    ["Evimin su tesisatı patladı", "su-tesisati-patlayinca-ilk-on-dakika"],
    ["Kışın evim sıcak olmuyor", "kisin-ev-isinmiyorsa-kombi-mi-petek-mi"],
    ["Aracım için uygun sigorta arıyorum", "arac-sigortasi-secerken-trafik-mi-kasko-mu"],
    ["İşletmeme web sitesi yaptırmak istiyorum", "isletmeye-web-sitesi-yaptirirken-brief"],
    ["Bu hafta sonu çocuklarla gidebileceğim bir yer arıyorum", "cocuklarla-hafta-sonu-nereye-gidilir"],
  ]
  for (const [sentence, slug] of expect) {
    assert.equal(searchGuides(articles, sentence)[0]?.href, `/blog/rehber/ihtiyac/${slug}`, sentence)
  }
  assert.ok(document.subcategories.some((item) => item.id === "sub-ihtiyac" && item.categoryId === "cat-rehber"))
  assert.deepEqual(blogKeywords(["Su Kaçağı", "su kaçağı", 3, ""]), ["su kacagi"])
  assert.deepEqual(parseKeywordList("kombi, petek;  yalıtım\nkombi"), ["kombi", "petek", "yalıtım"])
})

function business(category: string, city: string, district: string, slug: string): Business {
  return {
    id: slug,
    slug,
    name: slug,
    category,
    subcategory: "",
    city,
    district,
    address: "",
    lat: 0,
    lng: 0,
    phone: "",
    rating: 4,
    reviewCount: 2,
    priceLevel: 2,
    openNow: true,
    summary: `${slug} özeti`,
    about: "",
    services: [],
    amenities: [],
    tags: [],
    reviews: [],
    premium: false,
    verified: false,
    responseMinutes: 0,
    founded: 0,
    photo: "/photos/cafe.jpg",
    booking: "rezervasyon",
    hours: [],
  }
}
