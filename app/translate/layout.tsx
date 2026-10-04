import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện dịch câu · Verb Reader",
  description: "Luyện dịch câu tiếng Việt sang tiếng Anh theo câu mẫu trong bộ từ.",
};

export default function TranslateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
