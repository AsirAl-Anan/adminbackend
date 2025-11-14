import { MistralAIEmbeddings } from "@langchain/mistralai";


const embeddings = new MistralAIEmbeddings({
  model: "mistral-embed",
  apiKey: "GY2zDCWKAu6h4EmG5kO7QE429w1bhreu",
});
export default embeddings