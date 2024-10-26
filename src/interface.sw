library;

abi Constructor {
    #[storage(read, write)]
    fn constructor(owner: Identity);
    #[storage(read, write)]
    fn increment() -> u64;
    #[payable]
    fn lock();
}
