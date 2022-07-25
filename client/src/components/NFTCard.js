const NFTCard = ({ data }) => {
	const name = data?.name;
	const imageUrl = data?.image_url;
	const assetContractName = data?.asset_contract.name;
	const assetContractSymbol = data?.asset_contract_symbol;
	const animationUrl = data?.animation_url;
	const tokenId = data?.token_id;
	const displayName = name || `${assetContractSymbol} #${tokenId}`;
	const description = data?.description || 'no description';

	return (
		<div className="card card-bordered card-compact lg:card-normal">
			<figure>
				<img src={imageUrl} />
			</figure>
			<div className="card-body">
				<h2 className="card-title">{displayName}</h2>
				{assetContractSymbol && (
					<div className="badge badge-gost" size="sm">
						{assetContractSymbol}
					</div>
				)}
				<p className="text-sm">
					{assetContractName} #{tokenId}
				</p>
			</div>
		</div>
	);
};

export default NFTCard;
