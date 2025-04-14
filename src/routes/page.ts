import { fetchPageById, fetchBlocks } from "../api/notion";
import { parsePageId } from "../api/utils";
import { createResponse } from "../response";
import { getTableData } from "./table";
import { BlockType, CollectionType, HandlerRequest } from "../api/types";

// 줄바꿈을 <br />로 변환하는 함수
const formatBlockText = (text: string) => {
  return text.replace(/\n/g, "<br />");
};

export async function pageRoute(req: HandlerRequest) {
  const pageId = parsePageId(req.params.pageId);
  const page = await fetchPageById(pageId!, req.notionToken);

  const baseBlocks = page.recordMap.block;

  let allBlocks: { [id: string]: BlockType & { collection?: any } } = {
    ...baseBlocks,
  };
  let allBlockKeys;

  while (true) {
    allBlockKeys = Object.keys(allBlocks);

    const pendingBlocks = allBlockKeys.flatMap((blockId) => {
      const block = allBlocks[blockId];
      const content = block.value && block.value.content;

      if (!content || (block.value.type === "page" && blockId !== pageId!)) {
        return [];
      }

      return content.filter((id: string) => !allBlocks[id]);
    });

    if (!pendingBlocks.length) {
      break;
    }

    const newBlocks = await fetchBlocks(pendingBlocks, req.notionToken).then(
      (res) => res.recordMap.block
    );

    allBlocks = { ...allBlocks, ...newBlocks };
  }

  // 🔽 줄바꿈 변환 처리 추가
  for (const blockId in allBlocks) {
    const block = allBlocks[blockId];
    const val = block?.value as any;  // <- 여기에 any 타입 강제 부여

    if (val?.properties?.title && Array.isArray(val.properties.title)) {
      val.properties.title = val.properties.title.map((textArr: any[]) => {
        if (typeof textArr[0] === "string") {
          return [formatBlockText(textArr[0]), ...textArr.slice(1)];
        }
        return textArr;
      });
    }
  }

  const collection = page.recordMap.collection
    ? page.recordMap.collection[Object.keys(page.recordMap.collection)[0]]
    : null;

  const collectionView = page.recordMap.collection_view
    ? page.recordMap.collection_view[
        Object.keys(page.recordMap.collection_view)[0]
      ]
    : null;

  if (collection && collectionView) {
    const pendingCollections = allBlockKeys.flatMap((blockId) => {
      const block = allBlocks[blockId];
      return (block.value && block.value.type === "collection_view") ? [block.value.id] : [];
    });

    for (let b of pendingCollections) {
      const collPage = await fetchPageById(b!, req.notionToken);

      const coll = Object.keys(collPage.recordMap.collection).map(
        (k) => collPage.recordMap.collection[k]
      )[0];

      const collView: {
        value: { id: CollectionType["value"]["id"] };
      } = Object.keys(collPage.recordMap.collection_view).map(
        (k) => collPage.recordMap.collection_view[k]
      )[0];

      const { rows, schema } = await getTableData(
        coll,
        collView.value.id,
        req.notionToken,
        true
      );

      const viewIds = (allBlocks[b] as any).value.view_ids as string[];

      allBlocks[b] = {
        ...allBlocks[b],
        collection: {
          title: coll.value.name,
          schema,
          types: viewIds.map((id) => {
            const col = collPage.recordMap.collection_view[id];
            return col ? col.value : undefined;
          }),
          data: rows,
        },
      };
    }
  }

  return createResponse(allBlocks);
}
