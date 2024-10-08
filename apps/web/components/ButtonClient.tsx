"use client"

import { Button } from "@repo/ui/shad"
import Link from "next/link"
interface ButtonClientProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    linkTo: string;
    text: string;
    onClickFun?: () => void
}
export function ButtonClient({ linkTo, text, onClickFun, ...props }: ButtonClientProps) {
    return (
        <Button onClick={onClickFun} asChild {...props}>
            <Link href={linkTo}>{text}</Link>
        </Button>
    )
}