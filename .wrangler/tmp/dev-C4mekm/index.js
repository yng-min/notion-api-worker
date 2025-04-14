var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/tiny-request-router/dist/router.browser.mjs
var __assign = /* @__PURE__ */ __name(function() {
  __assign = Object.assign || /* @__PURE__ */ __name(function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  }, "__assign");
  return __assign.apply(this, arguments);
}, "__assign");
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at " + i);
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at ' + j);
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at " + j);
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at " + i);
      if (!pattern)
        throw new TypeError("Missing pattern at " + i);
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^" + escapeString(options.delimiter || "/#?") + "]+?";
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groups = path.source.match(/\((?!\?)/g);
  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: ""
      });
    }
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:" + parts.join("|") + ")", flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d;
  var endsWith = "[" + escapeString(options.endsWith || "") + "]|$";
  var delimiter = "[" + escapeString(options.delimiter || "/#?") + "]";
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
          } else {
            route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
          }
        } else {
          route += "(" + token.pattern + ")" + token.modifier;
        }
      } else {
        route += "(?:" + prefix + suffix + ")" + token.modifier;
      }
    }
  }
  if (end) {
    if (!strict)
      route += delimiter + "?";
    route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiter.indexOf(endToken[endToken.length - 1]) > -1 : (
      // tslint:disable-next-line
      endToken === void 0
    );
    if (!strict) {
      route += "(?:" + delimiter + "(?=" + endsWith + "))?";
    }
    if (!isEndDelimited) {
      route += "(?=" + delimiter + "|" + endsWith + ")";
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
var Router = (
  /** @class */
  function() {
    function Router2() {
      this.routes = [];
    }
    __name(Router2, "Router");
    Router2.prototype.all = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("ALL", path, handler, options);
    };
    Router2.prototype.get = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("GET", path, handler, options);
    };
    Router2.prototype.post = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("POST", path, handler, options);
    };
    Router2.prototype.put = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("PUT", path, handler, options);
    };
    Router2.prototype.patch = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("PATCH", path, handler, options);
    };
    Router2.prototype["delete"] = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("DELETE", path, handler, options);
    };
    Router2.prototype.head = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("HEAD", path, handler, options);
    };
    Router2.prototype.options = function(path, handler, options) {
      if (options === void 0) {
        options = {};
      }
      return this._push("OPTIONS", path, handler, options);
    };
    Router2.prototype.match = function(method, path) {
      for (var _i = 0, _a = this.routes; _i < _a.length; _i++) {
        var route = _a[_i];
        if (route.method !== method && route.method !== "ALL")
          continue;
        if (route.path === "(.*)") {
          return __assign(__assign({}, route), { params: { "0": route.path } });
        }
        if (route.path === "/" && route.options.end === false) {
          return __assign(__assign({}, route), { params: {} });
        }
        var matches = route.regexp.exec(path);
        if (!matches || !matches.length)
          continue;
        return __assign(__assign({}, route), { matches, params: keysToParams(matches, route.keys) });
      }
      return null;
    };
    Router2.prototype._push = function(method, path, handler, options) {
      var keys = [];
      if (path === "*") {
        path = "(.*)";
      }
      var regexp = pathToRegexp(path, keys, options);
      this.routes.push({ method, path, handler, keys, options, regexp });
      return this;
    };
    return Router2;
  }()
);
var keysToParams = /* @__PURE__ */ __name(function(matches, keys) {
  var params = {};
  for (var i = 1; i < matches.length; i++) {
    var key = keys[i - 1];
    var prop = key.name;
    var val = matches[i];
    if (val !== void 0) {
      params[prop] = val;
    }
  }
  return params;
}, "keysToParams");

// src/api/notion.ts
var NOTION_API = "https://www.notion.so/api/v3";
var loadPageChunkBody = {
  limit: 100,
  cursor: { stack: [] },
  chunkNumber: 0,
  verticalColumns: false
};
var fetchNotionData = /* @__PURE__ */ __name(async ({
  resource,
  body,
  notionToken
}) => {
  const res = await fetch(`${NOTION_API}/${resource}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...notionToken && { cookie: `token_v2=${notionToken}` }
    },
    body: JSON.stringify(body)
  });
  return res.json();
}, "fetchNotionData");
var fetchPageById = /* @__PURE__ */ __name(async (pageId, notionToken) => {
  const res = await fetchNotionData({
    resource: "loadPageChunk",
    body: {
      pageId,
      ...loadPageChunkBody
    },
    notionToken
  });
  return res;
}, "fetchPageById");
var queryCollectionBody = {
  loader: {
    type: "reducer",
    reducers: {
      collection_group_results: {
        type: "results",
        limit: 999,
        loadContentCover: true
      },
      "table:uncategorized:title:count": {
        type: "aggregation",
        aggregation: {
          property: "title",
          aggregator: "count"
        }
      }
    },
    searchQuery: "",
    userTimeZone: "Europe/Vienna"
  }
};
var fetchTableData = /* @__PURE__ */ __name(async (collectionId, collectionViewId, notionToken) => {
  const table = await fetchNotionData({
    resource: "queryCollection",
    body: {
      collection: {
        id: collectionId
      },
      collectionView: {
        id: collectionViewId
      },
      ...queryCollectionBody
    },
    notionToken
  });
  return table;
}, "fetchTableData");
var fetchNotionUsers = /* @__PURE__ */ __name(async (userIds, notionToken) => {
  const users = await fetchNotionData({
    resource: "getRecordValues",
    body: {
      requests: userIds.map((id) => ({ id, table: "notion_user" }))
    },
    notionToken
  });
  if (users && users.results) {
    return users.results.map((u) => {
      const user = {
        id: u.value.id,
        firstName: u.value.given_name,
        lastLame: u.value.family_name,
        fullName: u.value.given_name + " " + u.value.family_name,
        profilePhoto: u.value.profile_photo
      };
      return user;
    });
  }
  return [];
}, "fetchNotionUsers");
var fetchBlocks = /* @__PURE__ */ __name(async (blockList, notionToken) => {
  return await fetchNotionData({
    resource: "syncRecordValues",
    body: {
      requests: blockList.map((id) => ({
        id,
        table: "block",
        version: -1
      }))
    },
    notionToken
  });
}, "fetchBlocks");
var fetchNotionSearch = /* @__PURE__ */ __name(async (params, notionToken) => {
  return fetchNotionData({
    resource: "search",
    body: {
      type: "BlocksInAncestor",
      source: "quick_find_public",
      ancestorId: params.ancestorId,
      filters: {
        isDeletedOnly: false,
        excludeTemplates: true,
        isNavigableOnly: true,
        requireEditPermissions: false,
        ancestors: [],
        createdBy: [],
        editedBy: [],
        lastEditedTime: {},
        createdTime: {},
        ...params.filters
      },
      sort: "Relevance",
      limit: params.limit || 20,
      query: params.query
    },
    notionToken
  });
}, "fetchNotionSearch");

// src/api/utils.ts
var idToUuid = /* @__PURE__ */ __name((path) => `${path.slice(0, 8)}-${path.slice(8, 12)}-${path.slice(12, 16)}-${path.slice(16, 20)}-${path.slice(20)}`, "idToUuid");
var parsePageId = /* @__PURE__ */ __name((id) => {
  if (id) {
    const rawId = id.replace(/\-/g, "").slice(-32);
    return idToUuid(rawId);
  }
}, "parsePageId");
var getNotionValue = /* @__PURE__ */ __name((val, type, row) => {
  switch (type) {
    case "text":
      return getTextContent(val);
    case "person":
      return val.filter((v) => v.length > 1).map((v) => v[1][0][1]) || [];
    case "checkbox":
      return val[0][0] === "Yes";
    case "date":
      try {
        if (val[0][1][0][0] === "d") return val[0][1][0][1].start_date;
        else return "";
      } catch (e) {
        return "";
      }
    case "title":
      return getTextContent(val);
    case "select":
    case "email":
    case "phone_number":
    case "url":
      return val[0][0];
    case "multi_select":
      return val[0][0].split(",");
    case "number":
      return Number(val[0][0]);
    case "relation":
      return val.filter(([symbol]) => symbol === "\u2023").map(([_, relation]) => relation[0][1]);
    case "file":
      return val.filter((v) => v.length > 1).map((v) => {
        const rawUrl = v[1][0][1];
        const url = new URL(
          `https://www.notion.so${rawUrl.startsWith("/image") ? rawUrl : `/image/${encodeURIComponent(rawUrl)}`}`
        );
        url.searchParams.set("table", "block");
        url.searchParams.set("id", row.value.id);
        url.searchParams.set("cache", "v2");
        return { name: v[0], url: url.toString(), rawUrl };
      });
    default:
      console.log({ val, type });
      return "Not supported";
  }
}, "getNotionValue");
var getTextContent = /* @__PURE__ */ __name((text) => {
  return text.reduce((prev, current) => prev + current[0], "");
}, "getTextContent");

// src/response.ts
var createResponse = /* @__PURE__ */ __name((body, headers, statusCode) => {
  return new Response(JSON.stringify(body), {
    status: statusCode || 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json",
      ...headers
    }
  });
}, "createResponse");

// src/routes/table.ts
var getTableData = /* @__PURE__ */ __name(async (collection, collectionViewId, notionToken, raw) => {
  const table = await fetchTableData(
    collection.value.id,
    collectionViewId,
    notionToken
  );
  const collectionRows = collection.value.schema;
  const collectionColKeys = Object.keys(collectionRows);
  const tableArr = table.result.reducerResults.collection_group_results.blockIds.map(
    (id) => table.recordMap.block[id]
  );
  const tableData = tableArr.filter(
    (b) => b.value && b.value.properties && b.value.parent_id === collection.value.id
  );
  const rows = [];
  for (const td of tableData) {
    let row = { id: td.value.id };
    for (const key of collectionColKeys) {
      const val = td.value.properties[key];
      if (val) {
        const schema = collectionRows[key];
        row[schema.name] = raw ? val : getNotionValue(val, schema.type, td);
        if (schema.type === "person" && row[schema.name]) {
          const users = await fetchNotionUsers(row[schema.name]);
          row[schema.name] = users;
        }
      }
    }
    rows.push(row);
  }
  return { rows, schema: collectionRows };
}, "getTableData");
async function tableRoute(req) {
  const pageId = parsePageId(req.params.pageId);
  const page = await fetchPageById(pageId, req.notionToken);
  if (!page.recordMap.collection)
    return createResponse(
      JSON.stringify({ error: "No table found on Notion page: " + pageId }),
      {},
      401
    );
  const collection = Object.keys(page.recordMap.collection).map(
    (k) => page.recordMap.collection[k]
  )[0];
  const collectionView = Object.keys(page.recordMap.collection_view).map(
    (k) => page.recordMap.collection_view[k]
  )[0];
  const { rows } = await getTableData(
    collection,
    collectionView.value.id,
    req.notionToken
  );
  return createResponse(rows);
}
__name(tableRoute, "tableRoute");

// src/routes/page.ts
async function pageRoute(req) {
  const pageId = parsePageId(req.params.pageId);
  const page = await fetchPageById(pageId, req.notionToken);
  const baseBlocks = page.recordMap.block;
  let allBlocks = {
    ...baseBlocks
  };
  let allBlockKeys;
  while (true) {
    allBlockKeys = Object.keys(allBlocks);
    const pendingBlocks = allBlockKeys.flatMap((blockId) => {
      const block = allBlocks[blockId];
      const content = block.value && block.value.content;
      if (!content || block.value.type === "page" && blockId !== pageId) {
        return [];
      }
      return content.filter((id) => !allBlocks[id]);
    });
    if (!pendingBlocks.length) {
      break;
    }
    const newBlocks = await fetchBlocks(pendingBlocks, req.notionToken).then(
      (res) => res.recordMap.block
    );
    allBlocks = { ...allBlocks, ...newBlocks };
  }
  const collection = page.recordMap.collection ? page.recordMap.collection[Object.keys(page.recordMap.collection)[0]] : null;
  const collectionView = page.recordMap.collection_view ? page.recordMap.collection_view[Object.keys(page.recordMap.collection_view)[0]] : null;
  if (collection && collectionView) {
    const pendingCollections = allBlockKeys.flatMap((blockId) => {
      const block = allBlocks[blockId];
      return block.value && block.value.type === "collection_view" ? [block.value.id] : [];
    });
    for (let b of pendingCollections) {
      const collPage = await fetchPageById(b, req.notionToken);
      const coll = Object.keys(collPage.recordMap.collection).map(
        (k) => collPage.recordMap.collection[k]
      )[0];
      const collView = Object.keys(collPage.recordMap.collection_view).map(
        (k) => collPage.recordMap.collection_view[k]
      )[0];
      const { rows, schema } = await getTableData(
        coll,
        collView.value.id,
        req.notionToken,
        true
      );
      const viewIds = allBlocks[b].value.view_ids;
      allBlocks[b] = {
        ...allBlocks[b],
        collection: {
          title: coll.value.name,
          schema,
          types: viewIds.map((id) => {
            const col = collPage.recordMap.collection_view[id];
            return col ? col.value : void 0;
          }),
          data: rows
        }
      };
    }
  }
  return createResponse(allBlocks);
}
__name(pageRoute, "pageRoute");

// src/routes/user.ts
async function userRoute(req) {
  const users = await fetchNotionUsers([req.params.userId], req.notionToken);
  return createResponse(users[0]);
}
__name(userRoute, "userRoute");

// src/routes/search.ts
async function searchRoute(req) {
  const ancestorId = parsePageId(req.searchParams.get("ancestorId") || "");
  const query = req.searchParams.get("query") || "";
  const limit = Number(req.searchParams.get("limit") || 20);
  if (!ancestorId) {
    return createResponse(
      { error: 'missing required "ancestorId"' },
      { "Content-Type": "application/json" },
      400
    );
  }
  const results = await fetchNotionSearch(
    {
      ancestorId,
      query,
      limit
    },
    req.notionToken
  );
  return createResponse(results);
}
__name(searchRoute, "searchRoute");

// src/get-cache-key.ts
function getCacheKey(request) {
  const pragma = request.headers.get("pragma");
  if (pragma === "no-cache") {
    return null;
  }
  const cacheControl = request.headers.get("cache-control");
  if (cacheControl) {
    const directives = new Set(cacheControl.split(",").map((s) => s.trim()));
    if (directives.has("no-store") || directives.has("no-cache")) {
      return null;
    }
  }
  return request.url;
}
__name(getCacheKey, "getCacheKey");

// src/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS"
};
var router = new Router();
router.options("*", () => new Response(null, { headers: corsHeaders }));
router.get("/v1/page/:pageId", pageRoute);
router.get("/v1/table/:pageId", tableRoute);
router.get("/v1/user/:userId", userRoute);
router.get("/v1/search", searchRoute);
router.get(
  "*",
  async () => createResponse(
    {
      error: `Route not found!`,
      routes: ["/v1/page/:pageId", "/v1/table/:pageId", "/v1/user/:pageId"]
    },
    {},
    404
  )
);
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const requestAccountId = request.headers.get("x-account-id");
    const requestZoneId = request.headers.get("x-zone-id");
    if (!requestAccountId || !requestZoneId || requestAccountId !== env.ACCOUNT_ID || requestZoneId !== env.ZONE_ID) {
      return new Response("Unauthorized", { status: 403 });
    }
    const notionToken = env.NOTION_TOKEN || (request.headers.get("Authorization") || "").split("Bearer ")[1] || void 0;
    const match = router.match(request.method, pathname);
    if (!match) {
      return new Response("Endpoint not found.", { status: 404 });
    }
    const cache = caches.default;
    const cacheKey = getCacheKey(request);
    let cachedResponse;
    if (cacheKey) {
      try {
        cachedResponse = await cache.match(cacheKey);
      } catch (err) {
      }
    }
    const getResponseAndCache = /* @__PURE__ */ __name(async () => {
      const res = await match.handler({
        request,
        searchParams,
        params: match.params,
        notionToken,
        env,
        notionPages: []
        // ✅ 빈 배열 넘겨도 이제 의미 없음
      });
      if (cacheKey) {
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
      }
      return res;
    }, "getResponseAndCache");
    if (cachedResponse) {
      ctx.waitUntil(getResponseAndCache());
      return cachedResponse;
    }
    return getResponseAndCache();
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-heQkF5/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-heQkF5/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
/*! Bundled license information:

tiny-request-router/dist/router.browser.mjs:
  (*!
   * tiny-request-router v1.2.2 by berstend
   * https://github.com/berstend/tiny-request-router#readme
   * @license MIT
   *)
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0
  
  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.
  
  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** *)
*/
//# sourceMappingURL=index.js.map
