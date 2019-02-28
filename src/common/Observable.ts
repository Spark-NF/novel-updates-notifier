// tslint:disable:ban-types

export class Observable {
    private events: { [event: string]: Function[] } = {};

    public addEventListener(name: string, handler: Function): void {
        if (this.events.hasOwnProperty(name)) {
            this.events[name].push(handler);
        } else {
            this.events[name] = [handler];
        }
    }

    public removeEventListener(name: string, handler: Function) {
        if (!this.events.hasOwnProperty(name)) {
            return;
        }

        const index = this.events[name].indexOf(handler);
        if (index !== -1) {
            this.events[name].splice(index, 1);
        }
    }

    public fireEvent(name: string, args?: any[]) {
        if (!this.events.hasOwnProperty(name)) {
            return;
        }

        if (!args || !args.length) {
            args = [];
        }

        for (const handler of this.events[name]) {
            handler.apply(null, args);
        }
    }
}
