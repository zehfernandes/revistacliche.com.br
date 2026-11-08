import { seo } from "@/lib/seo";
import { About } from "./About";

// same page as the home: point search engines at "/"
export const metadata = { title: "Sobre", ...seo("/") };
export default About;
