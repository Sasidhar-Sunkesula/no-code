import { PromptInput } from "@/components/PromptInput";
import { BackgroundDots } from "@/components/ui/background-dots";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

const stagger = {
    animate: {
        transition: {
            staggerChildren: 0.2
        }
    }
};

export default function HomePage() {
    return (
        <BackgroundDots>
            <div className="flex flex-col h-full w-full">
                <motion.main
                    className="flex-1"
                    initial="initial"
                    animate="animate"
                    variants={stagger}
                >
                    <section className="py-20 md:py-28">
                        <div className="container px-4 md:px-6">
                            <motion.div
                                className="flex flex-col items-center gap-4 text-center"
                                variants={stagger}
                            >
                                <motion.div
                                    variants={{
                                        initial: { opacity: 0, scale: 0.8 },
                                        animate: {
                                            opacity: 1,
                                            scale: 1,
                                            transition: {
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 20
                                            }
                                        }
                                    }}
                                >
                                    <Badge variant="outline" className="px-3.5 py-1.5 bg-primary-foreground">
                                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                                        <span>AI-Powered Website Builder</span>
                                    </Badge>
                                </motion.div>

                                <motion.h1
                                    className="text-4xl font-semibold tracking-tighter sm:text-5xl md:text-6xl"
                                    variants={{
                                        initial: { opacity: 0, y: 30 },
                                        animate: {
                                            opacity: 1,
                                            y: 0,
                                            transition: {
                                                type: "spring",
                                                stiffness: 100,
                                                damping: 20
                                            }
                                        }
                                    }}
                                >
                                    Transform Your Ideas into
                                    <motion.span
                                        className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600"
                                        variants={{
                                            initial: { opacity: 0 },
                                            animate: {
                                                opacity: 1,
                                                transition: { delay: 0.5, duration: 0.8 }
                                            }
                                        }}
                                    >
                                        {' '}Stunning Websites
                                    </motion.span>
                                </motion.h1>

                                <motion.p
                                    className="max-w-[700px] text-muted-foreground"
                                    variants={fadeInUp}
                                >
                                    Turn your ideas into beautiful, production-ready websites with a simple prompt. No coding required.
                                </motion.p>

                                <motion.div
                                    className="mt-10 w-full max-w-3xl space-y-3"
                                    variants={{
                                        initial: { opacity: 0, y: 20 },
                                        animate: {
                                            opacity: 1,
                                            y: 0,
                                            transition: {
                                                delay: 0.6,
                                                duration: 0.8,
                                                type: "spring",
                                                stiffness: 100
                                            }
                                        }
                                    }}
                                >
                                    <PromptInput />
                                    <motion.p
                                        className="text-xs text-muted-foreground"
                                        variants={{
                                            initial: { opacity: 0 },
                                            animate: {
                                                opacity: 1,
                                                transition: { delay: 1, duration: 0.5 }
                                            }
                                        }}
                                    >
                                        Try: &quot;A portfolio site for a photographer with a dark theme and image gallery&quot;
                                    </motion.p>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>
                </motion.main>
            </div>
        </BackgroundDots>
    );
}
