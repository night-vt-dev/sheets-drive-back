exports.entry = class {
    constructor(timestamp, title, category, subject, content, researcher, illustPresent, allowOtherIllusts, illustration, handWritten, processed, validated) {
        this.timestamp = timestamp;
        this.title = title;
        this.category = category;
        this.subject = subject;
        this.content = content;
        this.researcher = researcher;
        this.illustPresent = illustPresent;
        this.allowOtherIllusts = allowOtherIllusts;
        this.illustration = illustration;
        this.processed = processed;
        this.validated = validated;
    }
}