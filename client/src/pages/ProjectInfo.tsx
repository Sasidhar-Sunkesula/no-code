import { API_URL } from "@/lib/constants";
import { ChatMessages } from "@repo/common/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useLocation, useParams } from "react-router";
import { SSE } from "sse.js";

export default function ProjectInfo() {
    const [loading, setLoading] = useState(true);
    const { projectId } = useParams();
    const location = useLocation();
    const { projectName, enhancedPrompt, assistantMessage, userMessage } = location.state as {
        projectName: string,
        enhancedPrompt: string,
        assistantMessage: string,
        userMessage: string
    }

    useEffect(() => {
        async function streamCode() {
            const reqBody: ChatMessages = [
                {
                    role: 'user',
                    parts: [{ text: enhancedPrompt }],
                },
                {
                    role: 'model',
                    parts: [{ text: assistantMessage }],
                },
                {
                    role: 'user',
                    parts: [{ text: userMessage }],
                },
                // {
                //     role: "user",
                //     parts: [
                //         {
                //             text: `
                //             # Project Files
                //             The following is a list of all project files and their complete contents that are currently visible and accessible to you.
                //             ${files.map(file => `
                //                     Path: ${file.path}
                //                     Content: ${file.content}
                //                 `).join('\n')}
                //             Here is a list of files that exist on the file system but are not being shown to you:
                //               - package-lock.json
                //         `
                //         },
                //     ]
                // },
                // {
                //     role: "user",
                //     parts: [{ text: uiPrompt }]
                // }, {
                //     role: "user",
                //     parts: [
                //         {
                //             text: `
                //             ${projectName}
                //             AGENDA: Generate the code for the project
                //             Here is a list of all files that have been modified since the start of the conversation.
                //             This information serves as the true contents of these files!

                //             The contents include either the full file contents or a diff (when changes are smaller and localized).

                //             Use it to:
                //             - Understand the latest file modifications
                //             - Ensure your suggestions build upon the most recent version of the files
                //             - Make informed decisions about changes
                //             - Ensure suggestions are compatible with existing code
                //             `
                //         }
                //     ]
                // }
            ]
            try {
                const source = new SSE(`${API_URL}/api/chat`, {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    payload: JSON.stringify({
                        messages: reqBody
                    })
                });
                source.onmessage = (event) => {
                    const data = event.data;
                    if (data) {
                        console.log(data);
                    }
                };
                source.onerror = () => {
                    setLoading(false);
                    source.close(); // Close the connection if an error occurs
                };
                source.onabort = () => {
                    setLoading(false);
                    source.close();
                }
            } catch (error) {
                setLoading(false);
                toast.error(error instanceof Error ? error.message : "Failed to fetch project");
            } finally {
                setLoading(false);
            }
        }
        if (projectId) streamCode();
    }, []);

    if (loading) {
        return <div className="min-h-screen w-full flex justify-center items-center">
            <Loader2 className="w-5 h-5 animate-spin" />
        </div>
    }
    return (
        <div>
            <Toaster />
        </div>
    )
}