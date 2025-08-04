import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from '../lib/firebase';


const threads = [
  {
    title: "親との価値観の違いに悩んでいます",
    tags: ["家族", "親子関係", "家庭内不和", "価値観", "親" ]
  },
  {
    title: "子育てがうまくいかない",
    tags: ["家族", "子育て", "親子関係", "子"]
  },
  {
    title: "夫との家事分担でもめています",
    tags: ["家族", "夫婦関係", "共働き・家事", "夫"]
  },
  {
    title: "介護疲れが限界です",
    tags: ["家族", "介護", "プレッシャー", "親", "夫", "妻", "子", "兄弟"]
  },
  {
    title: "義理の家族との関係がつらい",
    tags: ["家族", "義家族", "家庭内不和", "義父", "義母", "義兄", "義弟", "義姉", "義妹"]
  },
  {
    title: "子どもが反抗期で会話ができない",
    tags: ["家族", "親子関係", "子育て", "子", "反抗期"]
  },
  {
    title: "シングルマザーとしての不安",
    tags: ["家族", "子育て", "孤独", "子", "離婚", "ひとり親", "お金"]
  },
  {
    title: "家族に自分の気持ちを伝えられない",
    tags: ["家族", "家庭内不和", "秘密・打ち明け"]
  },
  {
    title: "親が過干渉で苦しい",
    tags: ["家族", "親子関係", "プレッシャー", "親", "過干渉"]
  },
  {
    title: "育児と仕事の両立ができない",
    tags: ["家族", "子育て", "共働き・家事", "仕事", "夫", "妻", "子", "お金"]
  },
  {
    title: "兄弟との不仲が長年続いています",
    tags: ["家族", "親子関係", "家庭内不和", "兄弟", "兄", "弟", "姉", "妹"]
  },
  {
    title: "家族内で孤立していると感じます",
    tags: ["家族", "孤独", "家庭内不和"]
  },
  {
    title: "親が病気になってから関係が変わった",
    tags: ["家族", "親子関係", "介護", "病気", "親", "夫", "妻"]
  },
  {
    title: "夫が育児に非協力的",
    tags: ["家族", "夫婦関係", "子育て", "夫", "妻", "仕事", "お金"]
  },
  {
    title: "子どもの進路について意見が合わない",
    tags: ["家族", "子育て", "進路", "子", "親"]
  },
  {
    title: "家族に秘密があって打ち明けられない",
    tags: ["家族", "秘密・打ち明け", "孤独"]
  },
  {
    title: "共働きなのに育児が私ばかり",
    tags: ["家族", "共働き・家事", "子育て", "夫", "妻", "仕事", "お金"]
  },
  {
    title: "親からのプレッシャーがつらい",
    tags: ["家族", "親子関係", "プレッシャー", "親"]
  },
  {
    title: "家族に頼れない自分が情けない",
    tags: ["家族", "孤独", "プレッシャー"]
  },
  {
    title: "家庭内の会話が減って不安です",
    tags: ["家族", "家庭内不和", "孤独"]
  }
];


export async function addThreads() {
  const threadsRef = collection(db, "threads");

  const slugify = (text: string) =>
    text
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[ー－―]/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .toLowerCase();

  for (let i = 0; i < threads.length; i++) {
    const t = threads[i];

    const slug = `${slugify(t.title)}-${i}`;
    console.log(`Slug: ${slug}`); //  デバッグ出力

    await addDoc(threadsRef, {
      title: t.title,
      tags: t.tags,
      postCount: 0,
      slug: slug,
      created_at: serverTimestamp(),
    });
  }

  console.log("スレッドを追加しました。");
}

addThreads();
