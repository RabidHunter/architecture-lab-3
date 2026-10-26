export type FakeResponse = {
    transactionId: string;
    status: "SUCCESS" | "PROCESSING" | "ERROR" | "UNKNOWN";
};

export class FakeProvider {
    async pay(amount: number, token: string): Promise<FakeResponse> {
        if (token === "fake_processing") return { transactionId: "f_1", status: "PROCESSING" };
        if (token === "fake_fail") return { transactionId: "f_2", status: "ERROR" };
        if (token === "fake_unknown") return { transactionId: "f_3", status: "UNKNOWN" };
        return { transactionId: "f_4", status: "SUCCESS" };
    }
}