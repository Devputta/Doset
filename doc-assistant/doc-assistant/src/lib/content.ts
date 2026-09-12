import {
  Search,
  Sparkles,
  Quote,
  FileText,
  MessagesSquare,
  ShieldCheck,
  UploadCloud,
  Cog,
  MessageCircleQuestion,
  BookMarked,
} from "lucide-react";

export const features = [
  {
    icon: Search,
    title: "Semantic search",
    description:
      "Find the right passage by meaning, not keywords — even when the wording in your question doesn't match the document.",
  },
  {
    icon: Sparkles,
    title: "RAG-powered answers",
    description:
      "Every answer is generated from retrieved passages of your own documents, not from the model's general training data.",
  },
  {
    icon: Quote,
    title: "Source citations",
    description:
      "Answers link back to the exact page and passage they came from, so you can verify anything the assistant tells you.",
  },
  {
    icon: FileText,
    title: "PDF & Markdown support",
    description:
      "Upload technical manuals, research papers, or Markdown notes — parsing is handled automatically on upload.",
  },
  {
    icon: MessagesSquare,
    title: "Document-specific chat",
    description:
      "Each document keeps its own conversation thread, so context never bleeds between unrelated files.",
  },
  {
    icon: ShieldCheck,
    title: "Secure document management",
    description:
      "Documents are stored per-account with clear status tracking, from upload through processing to ready-to-query.",
  },
];

export const steps = [
  {
    icon: UploadCloud,
    title: "Upload",
    description: "Drop in a PDF or Markdown file. No formatting or cleanup required.",
  },
  {
    icon: Cog,
    title: "Process",
    description: "The document is parsed, split into chunks, and embedded into vectors.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask",
    description: "Ask a question in plain language, the same way you'd ask a colleague.",
  },
  {
    icon: BookMarked,
    title: "Get cited answers",
    description: "Receive an answer grounded in your document, with a citation trail.",
  },
];

export const techStack = [
  { name: "Python", role: "Core backend language" },
  { name: "FastAPI", role: "API layer" },
  { name: "LangChain", role: "Chunking & RAG orchestration" },
  { name: "ChromaDB", role: "Vector store" },
  { name: "OpenAI / Anthropic embeddings", role: "Semantic representation" },
  { name: "React / Next.js", role: "Frontend application" },
  { name: "OpenAI / Anthropic LLM", role: "Grounded answer generation" },
];

export const dashboardNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Documents", href: "/dashboard/documents" },
  { label: "Chat History", href: "/dashboard/chat-history" },
  { label: "Settings", href: "/dashboard/settings" },
];

export const footerLinks = {
  product: [
    { label: "GitHub", href: "https://github.com" },
    { label: "Documentation", href: "/docs" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Privacy", href: "/privacy" },
  ],
};
