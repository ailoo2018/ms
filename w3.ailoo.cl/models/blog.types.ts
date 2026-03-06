export class BlogComment {
    id: string = "";
    comment: string = "";
    likes: number = 0;
    postId: number = null;
    dislikes: number = 0;
    createdAt: Date = new Date();
    author: string = "Anonymous";
    accept: boolean = false;
    domainId: number = 0;

    constructor(init?: Partial<BlogComment>) {
        Object.assign(this, init);
    }
}